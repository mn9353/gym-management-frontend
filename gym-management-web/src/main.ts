import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';



bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    inject();
    injectSpeedInsights();
  })
  .catch((err) => console.error(err));
