import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import Instansi from './Instansi';
import PkiAgunan from './PkiAgunan';
import PkiNasabah from './PkiNasabah';
import Produk from './Produk';
import MasterStatusLos from './MasterStatusLos';

@Entity('pki_pengajuan', { synchronize: false })
class PkiPengajuan {
  @PrimaryColumn({
    type: 'varchar',
    length: 11,
  })
  no_pengajuan: string;

  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  no_ktp: string;

  @Column({
    type: 'varchar',
    length: 11,
    nullable: true,
  })
  kode_produk: string;

  @Column({
    type: 'date',
  })
  tgl_pengajuan: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  kode_outlet: string;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  jumlah_pinjaman: number;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  angsuran: number;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  total_uang_muka: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  status_pengajuan: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  created_date: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  modified_date: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  kategori_pengajuan: string;

  @Column({
    type: 'varchar',
    length: 2,
    nullable: true,
  })
  kode_channel: string;

  @Column({
    type: 'int4',
    nullable: true,
  })
  tenor: number;

  @Column({
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  status_usaha: string;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  uang_pokok: number;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  sewa_modal: number;

  @Column({
    type: 'date',
    nullable: true,
  })
  tgl_expired: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  no_aplikasi_los: string;

  @Column({
    type: 'int4',
    nullable: true,
  })
  kode_instansi: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  response_los: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  body_los: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  updated_by: string;

  @Column({
    type: 'bool',
    default: false,
  })
  is_promo: boolean;

  @Column({
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  promo_id: string;

  @Column({
    type: 'varchar',
    length: 220,
    nullable: true,
  })
  promomicrosite_id: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  kode_voucher: string;

  @Column()
  @CreateDateColumn()
  created_at: Date;

  @Column()
  @UpdateDateColumn()
  updated_at: Date;

  @Column({
    nullable: true,
  })
  klaim_at: Date;

  @OneToOne(() => PkiNasabah)
  @JoinColumn([{ name: 'no_ktp', referencedColumnName: 'no_ktp' }])
  pki_nasabah: PkiNasabah;

  @OneToOne(() => PkiAgunan)
  @JoinColumn([{ name: 'no_pengajuan', referencedColumnName: 'no_pengajuan' }])
  pki_agunan: PkiAgunan;

  @OneToOne(() => Instansi)
  @JoinColumn([{ name: 'kode_instansi', referencedColumnName: 'id' }])
  instansi: Instansi;

  @OneToOne(() => Produk)
  @JoinColumn([{ name: 'kode_produk', referencedColumnName: 'kode_produk' }])
  produk: Produk;

  @OneToOne(() => MasterStatusLos)
  @JoinColumn([{ name: 'status_pengajuan', referencedColumnName: 'id_status_microsite' }])
  master_status_los: MasterStatusLos;
}

export default PkiPengajuan;
