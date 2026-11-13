import { Delete, Get, Patch, Post, Put } from '@nestjs/common';
import type { AppRoute } from '@ts-restless/core';
import { getNestRoutePaths } from './route-paths';

export const getHttpVerbDecorator = (route: AppRoute): MethodDecorator => {
  const path = getNestRoutePaths(route.path);
  switch (route.method) {
    case 'GET':
      return Get(path);
    case 'POST':
      return Post(path);
    case 'PUT':
      return Put(path);
    case 'PATCH':
      return Patch(path);
    case 'DELETE':
      return Delete(path);
  }
};
