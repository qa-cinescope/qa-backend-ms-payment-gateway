import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "@prisma/prisma.service";

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async findOne(idOrEmail: string, isReset: boolean = false) {
    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [{ id: idOrEmail }, { email: idOrEmail }],
      },
    });

    return user;
  }
}
