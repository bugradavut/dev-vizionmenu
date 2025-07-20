import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RFC7807ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  timestamp?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let type: string;
    let title: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
      } else {
        message = exception.message;
      }

      // Map HTTP status to RFC 7807 types
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          type = 'https://vizionmenu.com/errors/bad-request';
          title = 'Bad Request';
          break;
        case HttpStatus.UNAUTHORIZED:
          type = 'https://vizionmenu.com/errors/unauthorized';
          title = 'Unauthorized';
          break;
        case HttpStatus.FORBIDDEN:
          type = 'https://vizionmenu.com/errors/forbidden';
          title = 'Forbidden';
          break;
        case HttpStatus.NOT_FOUND:
          type = 'https://vizionmenu.com/errors/not-found';
          title = 'Not Found';
          break;
        case HttpStatus.CONFLICT:
          type = 'https://vizionmenu.com/errors/conflict';
          title = 'Conflict';
          break;
        case HttpStatus.UNPROCESSABLE_ENTITY:
          type = 'https://vizionmenu.com/errors/validation-error';
          title = 'Validation Error';
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          type = 'https://vizionmenu.com/errors/rate-limit';
          title = 'Rate Limit Exceeded';
          break;
        default:
          type = 'https://vizionmenu.com/errors/http-error';
          title = 'HTTP Error';
      }
    } else {
      // Handle non-HTTP exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      type = 'https://vizionmenu.com/errors/internal-server-error';
      title = 'Internal Server Error';

      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Create RFC 7807 compliant error response
    const errorResponse: RFC7807ErrorResponse = {
      type,
      title,
      status,
      detail: message,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    // Log the error for monitoring
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }
}