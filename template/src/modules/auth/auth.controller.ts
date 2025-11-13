import {
  Controller,
  Post,
  Body,
  HttpCode,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { Public } from "../../common/decorator/public.decorator";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";

@ApiTags("Authentication")
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {}

  @Public()
  @Post("login")
  @ApiBody({ description: "Login credentials", type: LoginDto })
  async login(@Body() body: LoginDto) {
    if (!body || !body.userId || !body.password) {
      throw new UnauthorizedException("Missing login credentials");
    }

    const user = await this.authService.validateUser(
      body.userId,
      body.password
    );
    return this.authService.login(user);
  }

  @Public()
  @Post("refresh")
  @ApiBody({
    description: "Provide your userId and refreshToken",
    schema: {
      type: "object",
      properties: {
        userId: { type: "string", example: "USER_20250815001" },
        refreshToken: { type: "string", example: "xxxx.yyyy.zzzz" },
      },
      required: ["userId", "refreshToken"],
    },
  })
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    if (!body || !body.userId || !body.refreshToken) {
      throw new UnauthorizedException("Missing login credentials");
    }

    let payload: any;
    const modifiedUserId = body.userId.replace(/\s+/g, "");

    try {
      payload = this.jwtService.verify(body.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new UnauthorizedException("Refresh Token expired");
      }
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (String(payload.userId).trim() !== modifiedUserId) {
      throw new UnauthorizedException("Unauthorized access");
    }

    const user = await this.authService.getUserByUserId(modifiedUserId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const newAccessToken = this.jwtService.sign(
      { sub: user.id, userId: user.userId },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRATION_TIME as any,
      }
    );

    return {
      userId: user.userId,
      access_token: newAccessToken,
    };
  }

  @Public()
  @Post("validate")
  @HttpCode(200)
  @ApiBody({
    description: "Provide the access token to validate",
    schema: {
      type: "object",
      properties: {
        token: { type: "string", example: "xxxx.yyyy.zzzz" },
      },
      required: ["token"],
    },
  })
  async validate(@Body() body: { token: string }) {
    try {
      const payload = this.jwtService.verify(body.token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      return payload;
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new UnauthorizedException("Token expired");
      }
      throw new UnauthorizedException("Invalid token");
    }
  }
}
