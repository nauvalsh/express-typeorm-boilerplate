import { NextFunction, Request, Response } from 'express';
import { FindOptionsWhere, ILike, In } from 'typeorm';
import { objectRemove, objectUpload } from '~/config/minio';
import { dataSource } from '~/orm/dbCreateConnection';
import { generateFileName } from '~/utils/common';
import CustomError from '~/utils/customError';
import queryHelper from '~/utils/queryHelper';
import User from '../orm/entities/User';
import * as common from '~/utils/common';

const userRepo = dataSource.getRepository(User);

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: FindOptionsWhere<User> = {};
    const filter = {
      kode_role: (req.query.kode_role as string) ?? null,
      kode_unit_kerja: (req.query.kode_unit_kerja as string) ?? null,
      nik_user: common.isSalesRole(req.user.kode_role) ? req.user.nik : undefined,
      nama: (req.query.nama as string) ?? null,
      is_active: (+req.query.is_active as number) ?? null,
    };

    if (filter.kode_role) {
      where.kode_role = In(filter.kode_role.split(','));
    }

    if (filter.kode_unit_kerja) {
      where.kode_unit_kerja = In(filter.kode_unit_kerja.split(','));
    }

    if (filter.nik_user) {
      where.nik = filter.nik_user;
    }

    if (filter.nama) {
      where.nama = ILike(`%${filter.nama}%`);
    }

    if (filter.is_active) {
      where.is_active = filter.is_active;
    }

    const paging = queryHelper.paging(req.query);

    const [users, count] = await userRepo.findAndCount({
      take: paging.limit,
      skip: paging.offset,
      select: ['id', 'nik', 'nama', 'kode_role', 'kode_unit_kerja', 'last_login', 'is_active', 'unit_kerja'],
      where,
      relations: {
        unit_kerja: true,
      },
    });

    const dataRes = {
      meta: {
        count,
        limit: paging.limit,
        offset: paging.offset,
      },
      users,
    };

    return res.customSuccess(200, 'Get users success', dataRes, {
      count: count,
      rowCount: paging.limit,
      limit: paging.limit,
      offset: paging.offset,
      page: Number(req.query.page),
    });
  } catch (e) {
    return next(e);
  }
};

export const editUser = async (req: Request, res: Response, next: NextFunction) => {
  let fileName: string = null;

  try {
    let photo: Express.Multer.File = null;
    const bodies = req.body as User;
    const user = await userRepo.findOne({ where: { nik: req.params.nik } });

    if (!user) return next(new CustomError(`User tidak ditemukan`, 404));

    const userPhoto = user.photo ? user.photo.valueOf() : null;
    if (req.user.nik != req.params.nik && !(req.user.kode_role == 'SADM' || req.user.kode_role == 'ADMN'))
      return next(new CustomError('User is not allowed to edit this user', 404));

    if (req.files && req.files['photo']) {
      photo = req.files['photo'][0];
      fileName = 'hbluserprofile/' + generateFileName(photo.originalname);

      await objectUpload(process.env.MINIO_BUCKET, fileName, photo.buffer, {
        'Content-Type': req.files['photo'][0].mimetype,
        'Content-Disposision': 'inline',
      });
    }

    const updateBody = {};

    if (bodies.nama) updateBody['nama'] = bodies.nama;
    if (bodies.email) updateBody['email'] = bodies.email;
    if (bodies.photo) updateBody['photo'] = fileName;
    if (bodies.kode_role) updateBody['kode_role'] = bodies.kode_role;
    if (bodies.kode_unit_kerja) updateBody['kode_unit_kerja'] = bodies.kode_unit_kerja;
    if (bodies.is_active) updateBody['is_active'] = bodies.is_active;

    const updateUser = await userRepo.update({ nik: req.params.nik }, updateBody);

    if (userPhoto) {
      await objectRemove(process.env.MINIO_BUCKET, userPhoto);
    }

    const dataRes = {
      user: updateUser,
    };

    return res.customSuccess(200, 'User updated', dataRes);
  } catch (e) {
    return next(e);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = req.params;

    const user = await userRepo.findOne({
      select: {
        id: true,
        nik: true,
        email: true,
        nama: true,
        photo: true,
        kode_role: true,
        kode_unit_kerja: true,
        is_active: true,
        is_approved: true,
      },
      where: [
        {
          id: +params.id || undefined,
        },
        {
          nik: params.id || '',
        },
      ],
      relations: {
        role: true,
        unit_kerja: true,
      },
    });

    const dataRes = {
      user,
    };

    return res.customSuccess(200, 'Get user success', dataRes);
  } catch (e) {
    return next(e);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.delete({ id: +req.params.id });

    const dataRes = {
      user: user,
    };

    return res.customSuccess(200, 'Delete user success', dataRes);
  } catch (e) {
    return next(e);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = await userRepo.findOne({ where: { nik: req.params.nik } });

    if (!currentUser) return next(new CustomError(`User tidak ditemukan`, 404));

    currentUser.password = req.params.nik;
    currentUser.hashPassword();

    const user = await userRepo.update(
      { nik: req.params.nik },
      {
        password: currentUser.password,
      },
    );

    const dataRes = {
      user: user,
    };

    return res.customSuccess(200, 'Reset User Password', dataRes);
  } catch (e) {
    return next(e);
  }
};
