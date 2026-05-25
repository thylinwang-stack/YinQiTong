import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { RequirePermissions } from '@/common/auth/rbac.decorators';
import { AdminBookingQueryDto, CreateBookingDto, PublicAssistantQueryDto } from './dto/public-api.dto';
import { PublicApiService } from './public-api.service';

@Controller()
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get('/service-scenes')
  listScenes() {
    return this.publicApiService.listScenes();
  }

  @Get('/packages')
  listPackages(@Query('sceneId') sceneId?: string) {
    return this.publicApiService.listPackages(sceneId);
  }

  @Get('/assistants/public')
  listPublicAssistants(@Query() query: PublicAssistantQueryDto) {
    return this.publicApiService.listPublicAssistants(query);
  }

  @Get('/assistants/public/:id')
  getPublicAssistant(@Param('id') id: string) {
    return this.publicApiService.getPublicAssistant(id);
  }

  @Post('/bookings')
  @UseGuards(BearerAuthGuard)
  createBooking(@Body() dto: CreateBookingDto, @Headers('authorization') authorization?: string) {
    return this.publicApiService.createBooking(dto, authorization);
  }

  @Get('/bookings/my')
  @UseGuards(BearerAuthGuard)
  listMyOrders(@Headers('authorization') authorization?: string) {
    return this.publicApiService.listMyOrders(authorization);
  }

  @Get('/bookings/:id')
  @UseGuards(BearerAuthGuard)
  getOrder(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.publicApiService.getBookingOrder(id, authorization);
  }

  @Get('/admin/bookings')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('booking:read')
  listAdminBookings(@Query() query: AdminBookingQueryDto) {
    return this.publicApiService.listAdminBookings(query);
  }
}
