FROM public.ecr.aws/lambda/python:3.12

RUN dnf install -y libgomp && dnf clean all

COPY requirements-lambda.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements-lambda.txt

COPY . ${LAMBDA_TASK_ROOT}/

CMD ["lambda_handler.handler"]
