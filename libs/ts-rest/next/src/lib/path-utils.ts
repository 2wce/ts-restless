import { AppRoute } from '@ts-restless/core';

/**
 * Get path params from array of url segments
 * @param urlChunks ['posts', '1', 'comments', '2']
 * @param appRoute
 * @returns
 */
export const getPathParamsFromArray = (
  urlChunks: string[],
  appRoute: AppRoute,
): Record<string, string> => {
  const pathAsArr = appRoute.path.split('/').slice(1);

  const pathParams: Record<string, string> = {};

  urlChunks.forEach((baseUrlPart, index) => {
    pathParams[pathAsArr[index]] = baseUrlPart;
  });

  return Object.entries(pathParams).reduce(
    (acc, [key, value]) => {
      if (key.startsWith(':')) {
        const keyWithoutColon = key.slice(1);
        acc[keyWithoutColon] = value;
      }

      return acc;
    },
    {} as Record<string, string>,
  );
};
