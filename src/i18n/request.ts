import { getRequestConfig } from 'next-intl/server';

import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  const locale = defaultLocale;

  return {
    locale,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    messages: (await import(`./messages/${locale}.json`)).default as Record<string, string>,
  };
});
