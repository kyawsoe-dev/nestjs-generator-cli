import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import * as argon2 from "argon2";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(userId: string, password: string) {
    const modifiedUserId = userId?.replace(/\s+/g, "");

    const user = await this.prisma.user.findUnique({
      where: { userId: modifiedUserId },
    });

    if (!user || !(await argon2.verify(user.password, password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async login(user: {
    id: string | number;
    userId: string;
    name?: string | null;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const payload = { sub: user.id, userId: user.userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRATION_TIME,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
    });

    return {
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async getUserByUserId(userId: string) {
    return this.prisma.user.findUnique({
      where: { userId },
    });
  }
}
