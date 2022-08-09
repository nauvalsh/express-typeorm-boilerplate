import { NextFunction, Request, Response } from 'express';
import APISSO from '~/apis/sso';
import { objectUpload, objectRemove } from '~/config/minio';
import { ISSOExchangeTokenResponse } from '~/interfaces/ISso';
import { dataSource } from '~/orm/dbCreateConnection';
import { generateFileName } from '~/utils/common';
import ssoHelper from '~/utils/ssoHelper';
import User from '../orm/entities/User';
import CustomError from '../utils/customError';
import { signToken } from './../services/tokenSrv';

const userRepo = dataSource.getRepository(User);

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let photo: Express.Multer.File = null;
    const bodies = req.body as User;
    const user = new User();
    let fileName: string = null;

    const checkExistingNik = await userRepo.findOne({ where: [{ email: bodies.email }, { nik: bodies.nik }] });

    if (checkExistingNik) {
      return next(new CustomError(`NIK / Email sudah ada`, 400));
    }

    if (req.files && req.files['photo']) {
      photo = req.files['photo'][0];
      fileName = 'hbluserprofile/' + generateFileName(photo.originalname);

      await objectUpload(process.env.MINIO_BUCKET, fileName, photo.buffer, {
        'Content-Type': req.files['photo'][0].mimetype,
        'Content-Disposision': 'inline',
      });
    }

    user.nama = bodies.nama;
    user.email = bodies.email;
    user.password = bodies.password;
    user.photo = fileName;
    user.nik = bodies.nik;
    user.kode_role = bodies.kode_role;
    user.kode_unit_kerja = bodies.kode_unit_kerja;
    user.hashPassword();
    await userRepo.save(user);

    const token = await signToken(user);

    user.password = undefined;

    const dataRes = {
      user,
      bearer: token,
    };

    return res.customSuccess(200, 'New user created', dataRes);
  } catch (e) {
    return next(e);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodies = req.body;

    const user = await userRepo.findOne({
      select: {
        role: {
          nama: true,
          kode: true,
        },
        unit_kerja: {
          nama: true,
          kode: true,
        },
      },
      where: [{ email: bodies.email }, { nik: bodies.username }],
      relations: { role: true, unit_kerja: true },
    });

    if (!user) return next(new CustomError('User not found', 404));

    const isPassMatch = user.checkIfPasswordMatch(bodies.password);

    if (!isPassMatch) return next(new CustomError('Invalid password', 404));

    const token = await signToken(user);

    user.password = undefined;

    const dataRes = {
      user,
      bearer: token,
    };

    return res.customSuccess(200, 'Login success', dataRes);
  } catch (e) {
    return next(e);
  }
};

export const exchangeTokenSso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodies = req.body;

    const loginSSO = await APISSO.exchangeTokenSso(bodies.code);

    if (loginSSO.status !== 200) return next(new CustomError(loginSSO.data.error_description, 400));

    const ssoRes = loginSSO.data as ISSOExchangeTokenResponse;

    let user = await userRepo.findOne({ where: { nik: ssoRes.nik } });

    const kodeRole = ssoHelper.setRole(ssoRes.kode_jabatan);

    if (!user) {
      user = await userRepo.save({
        nama: ssoRes.nama_lengkap,
        nik: ssoRes.nik,
        email: ssoRes.email,
        kode_role: kodeRole,
        kode_unit_kerja: ssoRes.kode_unit_kerja,
        photo: ssoRes.path_foto,
      });
    }

    const token = await signToken(user);
    const session = await userRepo.findOne({
      select: {
        role: {
          nama: true,
          kode: true,
        },
        unit_kerja: {
          nama: true,
          kode: true,
        },
      },
      relations: { role: true, unit_kerja: true },
      where: { id: user.id },
    });

    const dataRes = {
      user: session,
      bearer: token,
    };

    return res.customSuccess(200, 'Login success', dataRes);
  } catch (e) {
    return next(e);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodies = req.body;

    const user = await userRepo.findOne({ where: { nik: req.params.nik } });

    if (!user) return next(new CustomError('User not found', 404));

    if (req.user.nik != user.nik) return next(new CustomError('User is not allowed to change password', 404));

    user.password = bodies.newPass;

    user.hashPassword();

    await userRepo.update({ nik: req.user.nik }, user);

    const dataRes = {
      user,
    };

    return res.customSuccess(200, 'Login success', dataRes);
  } catch (e) {
    return next(e);
  }
};

export const editUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let photo: Express.Multer.File = null;
    const bodies = req.body as User;
    const user = await userRepo.findOne({ where: { nik: req.params.nik } });

    if (!user) return next(new CustomError(`User tidak ditemukan`, 404));

    const userPhoto = user.photo ? user.photo.valueOf() : null;

    let fileName: string = null;

    if (req.user.nik != user.nik) return next(new CustomError('User is not allowed to change password', 404));

    if (req.files && req.files['photo']) {
      photo = req.files['photo'][0];
      fileName = 'hbluserprofile/' + generateFileName(photo.originalname);

      await objectUpload(process.env.MINIO_BUCKET, fileName, photo.buffer, {
        'Content-Type': req.files['photo'][0].mimetype,
        'Content-Disposision': 'inline',
      });
    }

    user.nama = bodies.nama;
    user.email = bodies.email;
    user.photo = fileName;
    user.kode_role = bodies.kode_role;
    user.kode_unit_kerja = bodies.kode_unit_kerja;
    await userRepo.update({ nik: req.user.nik }, user);

    if (userPhoto) {
      await objectRemove(process.env.MINIO_BUCKET, userPhoto);
    }

    const dataRes = {
      user,
    };

    return res.customSuccess(200, 'New user created', dataRes);
  } catch (e) {
    return next(e);
  }
};
