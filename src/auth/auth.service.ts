import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { Tokens } from './types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  //REGISTER
  async signupLocal(dto: AuthDto): Promise<Tokens> {
    const hashedPassword = await this.hashData(dto.password);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        hashedPassword,
      },
    });

    const tokens = await this.getToken(newUser.id, newUser.email);

    await this.updatedRefreshTokenHash(newUser.id, tokens.refreshToken);
    return tokens;
  }

  //LOGIN
  async signinLocal(dto: AuthDto): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Access Denied!');
    }

    const passwordsMatches = await bcrypt.compare(
      dto.password,
      user.hashedPassword,
    );

    // Logger.log(passwordsMatches);
    // Logger.log(dto.password);
    // Logger.log(user.hashedPassword);

    if (!passwordsMatches) {
      throw new ForbiddenException('Wrong Credentials!');
    }

    const tokens = await this.getToken(user.id, user.email);

    await this.updatedRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRefreshToken: {
          not: null,
        },
      },
      data: {
        hashedRefreshToken: null,
      },
    });
    return true;
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied!');
    }

    const refreshTokensMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!refreshTokensMatches) {
      throw new ForbiddenException('Wrong Credentials!');
    }

    const tokens = await this.getToken(user.id, user.email);

    await this.updatedRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async updatedRefreshTokenHash(userId: number, refreshToken: string) {
    const hash = await this.hashData(refreshToken);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRefreshToken: hash,
      },
    });
  }

  async getToken(userId: number, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: 'access-token-secret',
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: 'refresh-token-secret',
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  hashData(data: string) {
    return bcrypt.hash(data, 12);
  }
}
