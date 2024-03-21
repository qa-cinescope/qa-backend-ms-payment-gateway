import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { PrismaService } from "@prisma/prisma.service";
import { Role, Status } from "@repo/database";
import type { JwtPayload } from "@auth/interfaces";

import { CardCheckerResponse, PaymentRegistryResponse } from "./responses";
import { CardCheckerDto, CreatePaymentDto, FindAllQueryDto, PaymentRegistryDto } from "./dto";

@Injectable()
export class PaymentService {
  constructor(
    @Inject("CARD_CHECKER_SERVICE") private checkerClient: ClientKafka,
    @Inject("REGISTRY_SERVICE") private registryClient: ClientKafka,
    private readonly prismaService: PrismaService,
  ) {}

  async findAllPayments(dto: FindAllQueryDto) {
    const payments = await this.prismaService.payment.findMany({
      where: {
        status: dto.status,
      },
      take: dto.pageSize,
      skip: dto.page * dto.pageSize - dto.pageSize,
      orderBy: {
        createdAt: dto.createdAt,
      },
    });

    const count = await this.prismaService.payment
      .aggregate({
        _count: true,
        where: {
          status: dto.status,
        },
      })
      .then((res) => res._count)
      .catch(() => 0);

    const pageCount = Math.ceil(count / dto.pageSize);

    return { payments, count, page: dto.page, pageSize: dto.pageSize, pageCount };
  }

  async findAllUserPaymentsByUserId(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    const payments = await this.prismaService.payment.findMany({
      where: {
        userId,
      },
    });

    return payments;
  }

  async findAllUserPayments(userId: string) {
    const payments = await this.prismaService.payment.findMany({
      where: {
        userId,
      },
    });

    return payments;
  }

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    const movie = await this.prismaService.movie
      .findUnique({
        where: {
          id: dto.movieId,
        },
        select: {
          id: true,
          price: true,
        },
      })
      .catch(() => {
        throw new NotFoundException("Фильм не найден");
      });

    if (!movie) {
      throw new NotFoundException("Фильм не найден");
    }

    const total = movie.price * dto.amount;

    const cardCheckerDto: CardCheckerDto = {
      total,
      card: dto.card,
    };

    const cardCheckerResponse = await this.sendMessageWithTimeoutError<
      CardCheckerResponse,
      CardCheckerDto
    >(this.checkerClient, "create.payment", cardCheckerDto).catch(() => {
      throw new ServiceUnavailableException("Сервис карт временно недоступен");
    });

    const cardCheckerStatus = cardCheckerResponse.status;

    const paymentRegistryDto: PaymentRegistryDto = {
      userId,
      movieId: dto.movieId,
      total,
      amount: dto.amount,
      status: cardCheckerStatus,
    };

    const paymentRegistryResponse = await this.sendMessageWithTimeoutError<
      PaymentRegistryResponse,
      PaymentRegistryDto
    >(this.registryClient, "register.payment", paymentRegistryDto).catch(() => {
      throw new ServiceUnavailableException("Сервис регистрации платежа временно недоступен");
    });

    if (!paymentRegistryResponse) {
      throw new BadRequestException("Произошла ошибка при регистрации платежа");
    }

    switch (cardCheckerStatus) {
      case Status.SUCCESS:
        return cardCheckerResponse;

      case Status.INVALID_CARD:
        throw new BadRequestException({
          message: "Неверная карта",
          error: cardCheckerResponse,
        });

      default:
        throw new InternalServerErrorException("Произошла ошибка при регистрации платежа");
    }
  }

  async sendMessageWithTimeoutError<TResponse, TBody>(
    client: ClientKafka,
    topic: string,
    data: TBody,
    timeout: number = 3000,
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      let timerId: NodeJS.Timeout;

      const subscription = client.send<TResponse, TBody>(topic, data).subscribe({
        next: (res) => {
          resolve(res);
          clearTimeout(timerId);
        },
        error: () => {
          reject();
          //subscription.unsubscribe();
        },
      });

      timerId = setTimeout(() => {
        reject();
        //subscription.unsubscribe();
      }, timeout);
    });
  }
}
