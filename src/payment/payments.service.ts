import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { PrismaService } from "@prisma/prisma.service";
import { Status } from "@prisma/client";

import { CardCheckerResponse, PaymentRegistryResponse } from "./responses";
import { CardCheckerDto, CreatePaymentDto, FindAllQueryDto, PaymentRegistryDto } from "./dto";

@Injectable()
export class PaymentService {
  constructor(
    @Inject("CARD_CHECKER_SERVICE") private checkerClient: ClientKafka,
    @Inject("REGISTRY_SERVICE") private registryClient: ClientKafka,
    private readonly prismaService: PrismaService,
  ) {}

  private readonly logger = new Logger(PaymentService.name);

  async findAllPayments(dto: FindAllQueryDto) {
    this.logger.log("------------------- Finding all payments -------------------");

    this.logger.verbose("Page: " + dto.page);
    this.logger.verbose("Page size: " + dto.pageSize);
    this.logger.verbose("Status: " + dto.status);
    this.logger.verbose("Created at: " + dto.createdAt);

    const payments = await this.prismaService.payment
      .findMany({
        where: {
          status: dto.status,
        },
        take: dto.pageSize,
        skip: dto.page * dto.pageSize - dto.pageSize,
        orderBy: {
          createdAt: dto.createdAt,
        },
      })
      .catch(() => {
        this.logger.error("Database error");
        this.logger.log("------------------- End finding all payments -------------------");
        throw new ServiceUnavailableException("Сервис недоступен");
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

    this.logger.log("Found data:");

    this.logger.verbose("Count: " + count);
    this.logger.verbose("Page count: " + pageCount);
    this.logger.verbose("Page: " + dto.page);
    this.logger.verbose("Page size: " + dto.pageSize);

    this.logger.log("------------------- End finding all payments -------------------");

    return { payments, count, page: dto.page, pageSize: dto.pageSize, pageCount };
  }

  async findAllUserPaymentsByUserId(userId: string) {
    this.logger.log("------------------- Finding all payments by userId -------------------");

    this.logger.verbose("User ID: " + userId);

    const user = await this.prismaService.user
      .findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      })
      .catch(() => {
        this.logger.error("Database error");
        this.logger.log(
          "------------------- End finding all payments by userId -------------------",
        );
        throw new ServiceUnavailableException("Сервис недоступен");
      });

    if (!user) {
      this.logger.error("User not found");
      this.logger.log("------------------- End finding all payments by userId -------------------");
      throw new NotFoundException("Пользователь не найден");
    }

    const payments = await this.prismaService.payment
      .findMany({
        where: {
          userId,
        },
      })
      .catch(() => {
        this.logger.error("Database error");
        this.logger.log(
          "------------------- End finding all payments by userId -------------------",
        );
        throw new ServiceUnavailableException("Сервис недоступен");
      });

    this.logger.verbose("Found data: " + payments.length);

    this.logger.log("------------------- End finding all payments by userId -------------------");

    return payments;
  }

  async findAllUserPayments(userId: string) {
    this.logger.log("------------------- Finding all user payments -------------------");

    this.logger.verbose("User ID: " + userId);

    const payments = await this.prismaService.payment
      .findMany({
        where: {
          userId,
        },
      })
      .catch(() => {
        this.logger.error("Database error");
        this.logger.log("------------------- End finding all user payments -------------------");
        throw new ServiceUnavailableException("Сервис недоступен");
      });

    this.logger.verbose("Found data: " + payments.length);

    this.logger.log("------------------- End finding all user payments -------------------");

    return payments;
  }

  async createPayment(userId: string, dto: CreatePaymentDto) {
    this.logger.log("------------------- Creating payment -------------------");

    this.logger.verbose("User ID: " + userId);
    this.logger.verbose("Movie ID: " + dto.movieId);
    this.logger.verbose("Amount: " + dto.amount);

    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      this.logger.error("User not found");
      this.logger.log("------------------- End creating payment -------------------");
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
        this.logger.error("Database error");
        throw new NotFoundException("Фильм не найден");
      });

    if (!movie) {
      this.logger.error("Movie not found");
      this.logger.log("------------------- End creating payment -------------------");
      throw new NotFoundException("Фильм не найден");
    }

    const total = movie.price * dto.amount;

    const cardCheckerDto: CardCheckerDto = {
      total,
      card: dto.card,
    };

    this.logger.log("Sending data to card checker...");

    const cardCheckerResponse = await this.sendMessageWithTimeoutError<
      CardCheckerResponse,
      CardCheckerDto
    >(this.checkerClient, "create.payment", cardCheckerDto).catch(() => {
      this.logger.error("Card checker unavailable");
      this.logger.log("------------------- End creating payment -------------------");
      throw new ServiceUnavailableException("Сервис карт временно недоступен");
    });

    const cardCheckerStatus = cardCheckerResponse.status;

    this.logger.verbose("Card checker status: " + cardCheckerStatus);

    const paymentRegistryDto: PaymentRegistryDto = {
      userId,
      movieId: dto.movieId,
      total,
      amount: dto.amount,
      status: cardCheckerStatus,
    };

    this.logger.log("Sending data to payment registry...");

    const paymentRegistryResponse = await this.sendMessageWithTimeoutError<
      PaymentRegistryResponse,
      PaymentRegistryDto
    >(this.registryClient, "register.payment", paymentRegistryDto).catch(() => {
      this.logger.error("Payment registry unavailable");
      this.logger.log("------------------- End creating payment -------------------");
      throw new ServiceUnavailableException("Сервис регистрации платежа временно недоступен");
    });

    if (!paymentRegistryResponse) {
      this.logger.error("Payment registry error");
      this.logger.log("------------------- End creating payment -------------------");
      throw new BadRequestException("Произошла ошибка при регистрации платежа");
    }

    this.logger.verbose("Payment registry status: " + paymentRegistryResponse.status);

    this.logger.log("------------------- End creating payment -------------------");

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
