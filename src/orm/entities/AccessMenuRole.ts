import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import MasterMenu from './MasterMenu';
import Role from './Role';

@Entity('access_menu_role')
class AccessMenuRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({})
  role_id: number;

  @Column({})
  master_menu_id: number;

  @Column()
  @CreateDateColumn()
  created_at: Date;

  @Column()
  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => MasterMenu)
  @JoinColumn([{ name: 'master_menu_id', referencedColumnName: 'id' }])
  master_menu?: MasterMenu;

  @ManyToOne(() => Role)
  @JoinColumn([{ name: 'role_id', referencedColumnName: 'id' }])
  role: Role;
}

export default AccessMenuRole;
