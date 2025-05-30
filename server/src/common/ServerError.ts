/**
 */
export type ServerError = {
  message: string,
  name: string,
  code: string,
  config: string,
  request: Request,
  response: Response
};