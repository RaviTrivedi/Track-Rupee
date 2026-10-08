export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export function successResponse<T>(message: string, data: T): ApiResponse<T> {
  return { success: true, message, data };
}

export function errorResponse(message: string): ApiResponse<null> {
  return { success: false, message, data: null };
}
