import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { S3Service } from "src/common/s3/s3.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";
import { Paginate } from "src/common/utils/pagination.util";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, private s3Service: S3Service) {}

  async create(dto: CreateUserDto, file?: Express.Multer.File) {
    const hashedPassword = await argon2.hash(dto.password);
    let profileUrl = dto.profileUrl ?? null;

    if (file) profileUrl = await this.s3Service.uploadFile(file, "profiles/");

    const user = await this.prisma.user.create({
      data: {
        userId: dto.userId,
        name: dto.name ?? null,
        email: dto.email,
        password: hashedPassword,
        profileUrl,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(query: PaginationDto): Promise<PaginatedResponseDto<any>> {
    const {
      page = 1,
      limit = 10,
      search,
      all,
      sortBy = "id",
      sortOrder = "desc",
    } = query;

    const where: any = search
      ? {
          OR: [
            { userId: { contains: search } },
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    if (all === "true") {
      const data = await this.prisma.user.findMany({ where, orderBy });
      const total = data.length;

      const dataWithUrls = await Promise.all(
        data.map(async (u) => ({
          id: u.id,
          userId: u.userId,
          name: u.name,
          email: u.email,
          profileUrl: u.profileUrl
            ? await this.s3Service.getSignedUrl(u.profileUrl)
            : null,
        }))
      );

      return {
        total,
        limit: total,
        currentPage: 1,
        firstPage: 1,
        lastPage: 1,
        nextPage: null,
        previousPage: null,
        data: dataWithUrls,
      };
    }

    const paginated = await Paginate(this.prisma.user, {
      where,
      page,
      limit,
      orderBy,
    });

    paginated.data = await Promise.all(
      paginated.data.map(async (u: any) => ({
        id: u.id,
        userId: u.userId,
        name: u.name,
        email: u.email,
        profileUrl: u.profileUrl
          ? await this.s3Service.getSignedUrl(u.profileUrl)
          : null,
      }))
    );

    return paginated;
  }

  async findOne(id: string | number) {
    const user = await this.prisma.user.findUnique({ where: { id } as any });
    if (!user) throw new NotFoundException("User not found");

    const { password, profileUrl: storedProfileUrl, ...userData } = user;
    const profileUrl = storedProfileUrl
      ? await this.s3Service.getSignedUrl(storedProfileUrl)
      : null;

    return { ...userData, profileUrl };
  }

  async update(
    id: string | number,
    dto: UpdateUserDto,
    file?: Express.Multer.File
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id } as any,
    });
    if (!existing) throw new NotFoundException("User not found");

    const updatedPassword = dto.password
      ? await argon2.hash(dto.password)
      : existing.password;

    let profileUrl = existing.profileUrl;
    if (file) {
      if (existing.profileUrl) await this.s3Service.remove(existing.profileUrl);
      profileUrl = await this.s3Service.uploadFile(file, "profiles/");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id } as any,
      data: {
        name: dto.name ?? existing.name,
        email: dto.email ?? existing.email,
        password: updatedPassword,
        profileUrl,
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async remove(id: string | number) {
    const existing = await this.prisma.user.findUnique({
      where: { id } as any,
    });
    if (!existing) throw new NotFoundException("User not found");

    await this.prisma.user.delete({ where: { id } as any });
    return { deleted: true };
  }
}
