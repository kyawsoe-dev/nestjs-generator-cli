import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from 'src/common/dto';
import { Paginate } from 'src/common/utils/pagination.util';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    if (!dto.email) throw new BadRequestException('email is required');
    if (!dto.password) throw new BadRequestException('password is required');

    const hashedPassword = await argon2.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          userId: dto.userId,
          name: dto.name ?? null,
          email: dto.email,
          password: hashedPassword,
        },
      });
    } catch (error) {
      throw new BadRequestException('Failed to create user: ' + error.message);
    }
  }

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 10, search, all } = query;
    const where = search
      ? {
          OR: [{ name: { contains: search } }, { email: { contains: search } }],
        }
      : {};

    try {
      if (all === 'true') {
        const users = await this.prisma.user.findMany({
          where,
          orderBy: { id: 'asc' },
        });

        return {
          user_list: users.map((u) => ({
            id: u.id,
            userId: u.userId,
            name: u.name,
            email: u.email,
          })),
        };
      }

      const result = await Paginate<User>(this.prisma.user, {
        where,
        page,
        limit,
        orderBy: { id: 'asc' },
      });

      return {
        total: result.total,
        page: result.page,
        limit: result.limit,
        user_list: result.data.map((u) => ({
          id: u.id,
          userId: u.userId,
          name: u.name,
          email: u.email,
        })),
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch users: ' + error.message);
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (error) {
      throw new BadRequestException('Failed to fetch user: ' + error.message);
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (dto.password) {
      dto.password = await argon2.hash(dto.password);
    }

    const data: any = {
      name: dto.name ?? existing.name,
      email: dto.email ?? existing.email,
    };

    if (dto.password) data.password = dto.password;

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new BadRequestException('Failed to update user: ' + error.message);
    }
  }

  async remove(id: number) {
    try {
      const existing = await this.prisma.user.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('User not found');

      return await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      throw new BadRequestException('Failed to delete user: ' + error.message);
    }
  }
}
