import { AppModule } from './AppModule';
import { BridgeServerApp } from './BridgeServerApp';

async function bootstrap() {
  const app = new BridgeServerApp(AppModule);
  await app.start();
}

void bootstrap();
