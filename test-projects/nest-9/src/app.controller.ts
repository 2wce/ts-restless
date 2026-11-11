import { Controller } from '@nestjs/common';
import { tsRestHandler, TsRestHandler } from '@ts-restless/nest';
import { AppService } from './app.service';
import { contract } from './contract';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @TsRestHandler(contract)
  handler(): ReturnType<typeof tsRestHandler<typeof contract>> {
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
