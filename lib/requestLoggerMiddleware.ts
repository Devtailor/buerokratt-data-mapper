import { NextFunction, Request, Response } from 'express';

/**
 * @param res Original Response Object
 * @param send Original UNMODIFIED res.send function
 * @return A patched res.send which takes the send content, binds it to contentBody on
 * the res and then calls the original res.send after restoring it
 */
const resDotSendInterceptor =
  (res: Response & { contentBody?: any }, send: Response['send']) =>
  (content: any): Response => {
    res.contentBody = content;
    res.send = send;
    return res.send(content);
  };

export const requestLoggerMiddleware =
  ({ logger }: { logger: (msg: string) => void }) =>
  (req: Request, res: Response & { contentBody?: any }, next: NextFunction): void => {
    logger(
      `Request: {method: ${req.method}, url: ${req.url}, params: ${JSON.stringify(req.params)}, query: ${JSON.stringify(
        req.query,
      )}, body: ${JSON.stringify(req.body)}}`,
    );
    res.send = resDotSendInterceptor(res, res.send.bind(res));
    res.on('finish', () => {
      logger(`Response: {statusCode: ${res.statusCode}, responseData: ${JSON.stringify(res.contentBody)}}`);
    });
    next();
  };
