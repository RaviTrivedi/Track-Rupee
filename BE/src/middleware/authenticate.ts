import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { verifyAccessToken } from '../modules/auth/auth.token';
import { getCurrentUser } from '../modules/auth/auth.service';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
  const token = match?.[1];
  if (!token) throw new AppError('A Bearer access token is required.', 401);
  const userId = verifyAccessToken(token);
  // Recheck user existence so tokens belonging to removed accounts cannot authenticate.
  req.authUser = await getCurrentUser(userId);
  next();
});
