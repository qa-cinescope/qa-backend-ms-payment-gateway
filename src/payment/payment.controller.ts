import {
  Body,
  Controller,
  Get,
  Inject,
  OnModuleInit,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { Role, Status } from "@repo/database";

import { RolesGuard } from "@auth/guards/role.guard";
import { CurrentUser, Roles } from "@common/decorators";
import type { JwtPayload } from "@auth/interfaces";

import { PaymentService } from "./payments.service";
import { CreatePaymentDto, FindAllQueryDto } from "./dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FindAllResponse, PaymentRegistryResponse, PaymentResponse } from "./responses";

@ApiTags("Оплата")
@Controller()
export class PaymentController implements OnModuleInit {
  constructor(
    @Inject("CARD_CHECKER_SERVICE") private readonly checkerClient: ClientKafka,
    @Inject("REGISTRY_SERVICE") private readonly registryClient: ClientKafka,
    private readonly paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    this.checkerClient.subscribeToResponseOf("create.payment");
    this.registryClient.subscribeToResponseOf("register.payment");

    this.registryClient.connect();
    this.checkerClient.connect();
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({
    summary: "Создание оплаты",
    description: "Создание оплаты\n\n" + "**Roles: USER, ADMIN, SUPER_ADMIN**",
  })
  @ApiBody({
    type: CreatePaymentDto,
  })
  @ApiResponse({
    status: 400,
    description: "Неверные параметры",
    content: {
      "application/json": {
        schema: {
          example: { status: Status.INVALID_CARD },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Фильм не найден" })
  @ApiResponse({ status: 401, description: "Пользователь не авторизован" })
  @ApiResponse({
    status: 201,
    type: PaymentRegistryResponse,
    description: "Успешная оплата",
  })
  @ApiResponse({
    status: 503,
    description: "Сервис оплаты не доступен",
  })
  @ApiResponse({
    status: 500,
    description: "Внутренняя ошибка сервиса оплаты",
  })
  @Post("/create")
  async createPayment(
    @Body(new ValidationPipe()) dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.paymentService.createPayment(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Получение платежей пользователя",
    description: "Поиск оплат\n\n" + "**Roles: ADMIN, SUPER_ADMIN**",
  })
  @ApiParam({
    name: "userId",
    type: String,
    description: "Идентификатор пользователя",
  })
  @ApiResponse({ status: 200, type: [PaymentResponse] })
  @ApiResponse({
    status: 404,
    description: "Пользователь не найден",
  })
  @ApiResponse({
    status: 401,
    description: "Пользователь не авторизован",
  })
  @ApiResponse({
    status: 403,
    description: "Недостаточно прав",
  })
  @Get("/user/:userId")
  async findAllUserPayments(@Param("userId") userId: string) {
    return await this.paymentService.findAllUserPaymentsByUserId(userId);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({
    summary: "Получение платежей пользователя",
    description: "Поиск оплат\n\n" + "**Roles: USER, ADMIN, SUPER_ADMIN**",
  })
  @ApiResponse({ status: 200, type: [PaymentResponse] })
  @ApiResponse({
    status: 401,
    description: "Пользователь не авторизован",
  })
  @ApiResponse({
    status: 403,
    description: "Недостаточно прав",
  })
  @Get("/user")
  async findUserPayment(@CurrentUser() user: JwtPayload) {
    return await this.paymentService.findAllUserPayments(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Получение платежей пользователей",
    description: "Поиск оплат\n\n" + "**Roles: ADMIN, SUPER_ADMIN**",
  })
  @ApiResponse({ status: 200, type: FindAllResponse })
  @ApiResponse({
    status: 400,
    description: "Неверные параметры",
  })
  @ApiResponse({ status: 401, description: "Пользователь не авторизован" })
  @ApiResponse({ status: 403, description: "Недостаточно прав" })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  @Get("/find-all")
  async findAllPayments(@Query() query: FindAllQueryDto) {
    return await this.paymentService.findAllPayments(query);
  }
}
