import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { WorkflowNode } from './workflow-node.entity';
import { WorkflowExecution } from './workflow-execution.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ type: 'jsonb' })
  definition: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: 1 })
  version: number;

  @ManyToOne(() => User, user => user.workflows)
  createdBy: User;

  @ManyToOne(() => Organization, organization => organization.workflows)
  organization: Organization;

  @OneToMany(() => WorkflowNode, node => node.workflow)
  nodes: WorkflowNode[];

  @OneToMany(() => WorkflowExecution, execution => execution.workflow)
  executions: WorkflowExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}