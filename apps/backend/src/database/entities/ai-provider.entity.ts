import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';

export enum ProviderType {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
  CUSTOM = 'custom',
}

@Entity('ai_providers')
export class AIProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ProviderType,
  })
  type: ProviderType;

  @Column({ type: 'jsonb' })
  configuration: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'jsonb', nullable: true })
  rateLimits: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  costSettings: Record<string, any>;

  @ManyToOne(() => Organization)
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}