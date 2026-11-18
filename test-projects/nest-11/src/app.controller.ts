import {
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { tsRestHandler, TsRestHandler } from '@ts-restless/nest';
import { AppService } from './app.service';
import { contract } from './contract';

@Injectable()
class MethodGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    return context.switchToHttp().getRequest().headers['x-deny'] !== 'yes';
  }
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(MethodGuard)
  @TsRestHandler(contract)
  handler() {
    return tsRestHandler(contract, {
      getHello: async () => {
        return {
          status: 200,
          body: this.appService.getHello(),
        };
      },
    });
  }
}
