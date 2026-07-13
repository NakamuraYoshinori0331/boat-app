import { useCallback, useRef, useState } from 'react';
import api from '../api/client';

export type JobStatus = 'idle' | 'submitting' | 'running' | 'completed' | 'failed';

interface JobPollResult<T> {
  status: JobStatus;
  error: string | null;
  submitAndWait: (endpoint: string, payload: unknown) => Promise<T>;
  reset: () => void;
}

const POLL_INTERVAL_MS = 2000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useJobPolling<T = unknown>(): JobPollResult<T> {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus('idle');
    setError(null);
  }, []);

  const submitAndWait = useCallback(async (endpoint: string, payload: unknown): Promise<T> => {
    abortRef.current = false;
    setStatus('submitting');
    setError(null);

    try {
      const res = await api.post(endpoint, payload);

      if (res.status === 200) {
        setStatus('completed');
        return res.data as T;
      }

      if (res.status !== 202 || !res.data?.job_id) {
        throw new Error('ジョブの開始に失敗しました');
      }

      setStatus('running');
      const jobId = res.data.job_id as string;

      while (!abortRef.current) {
        await sleep(POLL_INTERVAL_MS);
        const poll = await api.get(`/jobs/${jobId}`);
        const jobStatus = poll.data.status as string;

        if (jobStatus === 'completed') {
          setStatus('completed');
          return poll.data.result as T;
        }
        if (jobStatus === 'failed') {
          throw new Error(poll.data.error || 'ジョブが失敗しました');
        }
      }

      throw new Error('キャンセルされました');
    } catch (err: unknown) {
      let message = '処理に失敗しました';
      if (err instanceof Error) {
        message = err.message;
      }
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
        if (detail) message = detail;
      }
      setStatus('failed');
      setError(message);
      throw new Error(message);
    }
  }, []);

  return { status, error, submitAndWait, reset };
}
