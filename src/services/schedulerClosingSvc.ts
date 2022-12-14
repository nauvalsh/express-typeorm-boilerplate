import dayjs from 'dayjs';
import { objectUpload } from '~/config/minio';
import { dataSource } from '~/orm/dbCreateConnection';
import { ITmpKreditQuery, ITmpKreditTabemasQuery } from '~/types/queryClosingTypes';
import { convertToCSV } from '~/utils/common';
import logger from '~/utils/logger';
import queryClosing from '~/utils/queryClosing';

// ==== CLOSING NON TABEMAS
export const schedulerClosing = async () => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  const manager = queryRunner.manager;

  try {
    logger.info('QUERY_CLOSING', `TMP_KREDIT STARTING AT ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`);

    // Select tmp_kredit
    const tmpKredits: ITmpKreditQuery[] = await manager.query(queryClosing.selectTmpKredit);

    // memproses semua baris yang ada pada table tmp_kredit
    for (const tmpKredit of tmpKredits) {
      // Check no kredit duplikat
      const checkNoKredit = await manager.query(
        `SELECT * FROM leads_closing lc WHERE lc.no_kontrak = '${tmpKredit.no_kontrak}'`,
      );

      if (checkNoKredit && checkNoKredit.length > 0) {
        // jika duplikat no kredit/kontrak update saldo te & osl ke 0
        //  AND CAST(created_at AS DATE) < CAST(now() AS date)
        await manager.query(
          `UPDATE leads_closing SET saldo_tabemas = NULL, osl = NULL WHERE no_kontrak = '${tmpKredit.no_kontrak}'`,
        );

        // insert ke leads closing
        await manager.query(
          `INSERT INTO leads_closing 
        (leads_id, nik_ktp, cif, no_kontrak, marketing_code, tgl_fpk, tgl_cif, tgl_kredit, kode_unit_kerja, kode_unit_kerja_pencairan, up, outlet_syariah, status_new_cif, osl, saldo_tabemas, channel_id,channel, kode_produk) VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);
        `,
          [
            tmpKredit.leads_id,
            tmpKredit.nik_ktp,
            tmpKredit.cif,
            tmpKredit.no_kontrak,
            tmpKredit.marketing_code,
            tmpKredit.tgl_fpk,
            null, //tgl cif null
            tmpKredit.tgl_kredit,
            tmpKredit.kode_outlet,
            tmpKredit.kode_outlet_pencairan,
            tmpKredit.up,
            tmpKredit.outlet_syariah,
            0,
            tmpKredit.osl,
            null,
            tmpKredit.channel_id,
            tmpKredit.nama_channel,
            tmpKredit.product_code,
          ],
        );
      } else {
        // jika tidak duplikat no kredit/kontrak insert ke tb leads_closing
        await manager.query(
          `INSERT INTO leads_closing 
        (leads_id, nik_ktp, cif, no_kontrak, marketing_code, tgl_fpk, tgl_cif, tgl_kredit, kode_unit_kerja, kode_unit_kerja_pencairan, up, outlet_syariah, status_new_cif, osl, saldo_tabemas, channel_id,channel, kode_produk) VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);
        `,
          [
            tmpKredit.leads_id,
            tmpKredit.nik_ktp,
            tmpKredit.cif,
            tmpKredit.no_kontrak,
            tmpKredit.marketing_code,
            tmpKredit.tgl_fpk,
            null, // tgl cif
            tmpKredit.tgl_kredit,
            tmpKredit.kode_outlet,
            tmpKredit.kode_outlet_pencairan,
            tmpKredit.up,
            tmpKredit.outlet_syariah,
            0,
            tmpKredit.osl,
            null,
            tmpKredit.channel_id,
            tmpKredit.nama_channel,
            tmpKredit.product_code,
          ],
        );
      }

      await manager.query(
        `UPDATE leads SET cif = $1, cif_created_at = $2 WHERE nik_ktp = $3 AND id = '${tmpKredit.leads_id}' AND cif IS NULL`,
        [tmpKredit.cif, tmpKredit.tgl_cif, tmpKredit.nik_ktp],
      );
    }

    // menghapus data history bigdata
    await manager.query(
      `DELETE FROM history_tmp_kredit WHERE current_date > CAST(CAST(created_at_kamila AS DATE) + INTERVAL '31 DAY' AS DATE)`,
    );

    // insert data yang dikirim bigdata ke table history
    // INSERT INTO history_tmp_kredit SELECT * FROM tmp_kredit
    const bigDataRaw = await manager.query(`SELECT * FROM tmp_kredit`);

    const csvFormat = convertToCSV(bigDataRaw);
    const buffer = Buffer.from(csvFormat);
    const fileName = 'hblkreditbigdata/' + dayjs().format(`DD-MM-YYYY`) + `_TMP_KRED_BIGDATA_${Date.now()}.csv`;

    const uploadCsv = await objectUpload(process.env.MINIO_BUCKET, fileName, buffer, {
      'Content-Type': 'text/csv',
      'Content-Disposision': 'inline',
    });

    // logger.info('IS_MINIO_UPLOADED', uploadCsv);

    await manager.query(`TRUNCATE tmp_kredit RESTART IDENTITY`);

    await queryRunner.commitTransaction();
    await queryRunner.release();

    logger.info('QUERY_CLOSING', `ENDED AT ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`);
  } catch (error) {
    logger.info('QUERY_CLOSING', `ERROR ENDED AT ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`);
    logger.error(error, 'QUERY_CLOSING_ERROR');
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }
};
// ==== END OF CLOSING NON TABEMAS

// ==== CLOSING TABEMAS
export const schedulerClosingTabemas = async () => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  const manager = queryRunner.manager;

  try {
    logger.info('QUERY_CLOSING', `TMP_KREDIT_TABEMAS STARTING AT ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`);

    // Select tmp_kredit
    const tmpKredits: ITmpKreditTabemasQuery[] = await manager.query(queryClosing.selectTmpKreditTabemas);

    // memproses semua baris yang ada pada table tmp_kredit
    for (const tmpKredit of tmpKredits) {
      const up = tmpKredit.jenis_transaksi === 'OPEN' ? tmpKredit.amount : tmpKredit.omset_te;

      // Check no kredit duplikat
      const checkNoKredit = await manager.query(
        `SELECT * FROM leads_closing lc WHERE lc.no_kontrak = '${tmpKredit.no_kontrak}'`,
      );

      if (checkNoKredit && checkNoKredit.length > 0) {
        // jika duplikat no_rekening update saldo te & osl ke 0
        // AND CAST(created_at AS DATE) < CAST(now() AS date)
        await manager.query(
          `UPDATE leads_closing SET saldo_tabemas = NULL, osl = NULL WHERE no_kontrak = '${tmpKredit.no_kontrak}'`,
        );

        // insert ke leads closing
        await manager.query(
          `INSERT INTO leads_closing 
        (leads_id, nik_ktp, cif, no_kontrak, marketing_code, tgl_fpk, tgl_kredit, kode_unit_kerja, kode_unit_kerja_pencairan, up, status_new_cif, osl, saldo_tabemas, channel_id,channel, kode_produk) VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
        `,
          [
            tmpKredit.leads_id,
            tmpKredit.nik_ktp,
            tmpKredit.cif,
            tmpKredit.no_kontrak,
            tmpKredit.marketing_code,
            tmpKredit.tgl_fpk,
            tmpKredit.tgl_kredit,
            tmpKredit.kode_outlet,
            tmpKredit.kode_outlet_pencairan,
            up,
            0,
            null,
            tmpKredit.saldo,
            tmpKredit.channel_id,
            tmpKredit.nama_channel,
            tmpKredit.product_code,
          ],
        );

        // update status leads ke CLS
        await manager.query(
          `UPDATE leads SET step = $1, cif = $2, updated_at = now() WHERE id = '${tmpKredit.leads_id}' AND step = 'CLP'`,
          ['CLS', tmpKredit.cif],
        );
      } else {
        // jika tidak duplikat insert ke tb leads_closing
        await manager.query(
          `INSERT INTO leads_closing 
        (leads_id, nik_ktp, cif, no_kontrak, marketing_code, tgl_fpk, tgl_kredit, kode_unit_kerja, kode_unit_kerja_pencairan, up, status_new_cif, osl, saldo_tabemas, channel_id,channel, kode_produk) VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
        `,
          [
            tmpKredit.leads_id,
            tmpKredit.nik_ktp,
            tmpKredit.cif,
            tmpKredit.no_kontrak,
            tmpKredit.marketing_code,
            tmpKredit.tgl_fpk,
            tmpKredit.tgl_kredit,
            tmpKredit.kode_outlet,
            tmpKredit.kode_outlet_pencairan,
            up,
            0,
            null,
            tmpKredit.saldo,
            tmpKredit.channel_id,
            tmpKredit.nama_channel,
            tmpKredit.product_code,
          ],
        );

        // update status leads ke CLS
        await manager.query(
          `UPDATE leads SET step = $1, cif = $2, updated_at = now() WHERE id = '${tmpKredit.leads_id}' AND step = 'CLP'`,
          ['CLS', tmpKredit.cif],
        );
      }

      await manager.query(
        `UPDATE leads SET cif = $1, cif_created_at = $2 WHERE nik_ktp = $3 AND id = '${tmpKredit.leads_id}' AND cif IS NULL`,
        [tmpKredit.cif, tmpKredit.tgl_cif, tmpKredit.nik_ktp],
      );
    }

    // menghapus data history bigdata
    await manager.query(
      `DELETE FROM history_tmp_kredit_tabemas WHERE current_date > CAST(CAST(created_at_kamila AS DATE) + INTERVAL '31 DAY' AS DATE)`,
    );

    // insert data yang dikirim bigdata ke table history
    const bigDataRaw = await manager.query(`SELECT * FROM tmp_kredit_tabemas`);

    const csvFormat = convertToCSV(bigDataRaw);
    const buffer = Buffer.from(csvFormat);
    const fileName = 'hblkreditbigdata/' + dayjs().format(`DD-MM-YYYY`) + `_TMP_KRED_TABEMAS_BIGDATA_${Date.now()}.csv`;

    const uploadCsv = await objectUpload(process.env.MINIO_BUCKET, fileName, buffer, {
      'Content-Type': 'text/csv',
      'Content-Disposision': 'inline',
    });

    // logger.info('IS_MINIO_UPLOADED', uploadCsv);

    await manager.query(`TRUNCATE tmp_kredit_tabemas RESTART IDENTITY`);

    await queryRunner.commitTransaction();
    await queryRunner.release();

    logger.info('QUERY_CLOSING', `ENDED AT ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`);
  } catch (error) {
    logger.info('QUERY_CLOSING', `ERROR ENDED AT ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`);
    logger.error(error, 'QUERY_CLOSING_ERROR');
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }
};
// ==== END OF CLOSING TABEMAS

export default {
  schedulerClosing,
  schedulerClosingTabemas,
};
