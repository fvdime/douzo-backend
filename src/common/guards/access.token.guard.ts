import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
// import { Observable } from 'rxjs';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // : boolean | Promise<boolean> | Observable<boolean>
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
