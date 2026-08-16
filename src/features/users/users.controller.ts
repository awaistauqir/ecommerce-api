import { Request, Response, NextFunction } from "express";
import { userService } from "./users.service";
import { BadRequestError } from "../../utils/errors";

export class UsersController {
  // GET /api/v1/users/me
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const user = await userService.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/users/me
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { name, email } = req.body;

      const user = await userService.updateProfile(userId, { name, email });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/users/me/password
  async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      await userService.updatePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
