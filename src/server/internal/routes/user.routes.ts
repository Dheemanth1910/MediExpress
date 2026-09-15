import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { UserService } from "../services/user/user.service";
import { AuthService } from "../services/user/auth.service";
import { createAuthenticateMiddleware } from "../middleware/authenticate.middleware";

export const createUserRoutes = (userService: UserService, authService: AuthService) => {
  const router = Router();
  const controller = new UserController(userService, authService);
  const authenticate = createAuthenticateMiddleware(authService);

  router.post("/create", controller.createUser.bind(controller));
  router.post("/login", controller.login.bind(controller));
  router.post("/logout", authenticate, controller.logout.bind(controller));
  router.put("/update/:id", authenticate, controller.updateUser.bind(controller));
  router.patch("/update/:id", authenticate, controller.updateUser.bind(controller));
  router.put("/update", authenticate, controller.updateUser.bind(controller));
  router.patch("/update", authenticate, controller.updateUser.bind(controller));
  router.get("/info/:id", authenticate, controller.getUserInfo.bind(controller));
  router.get("/info", authenticate, controller.getUserInfo.bind(controller));

  return router;
};
