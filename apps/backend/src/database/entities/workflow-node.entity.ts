import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Workflow } from './workflow.entity';

export enum NodeType {
  AI_AGENT = 'ai_agent',
  TOOL = 'tool',
  TRIGGER = 'trigger',
  CONDITION = 'condition',
  ACTION = 'action',
  WEBHOOK = 'webhook',
}

@Entity('workflow_nodes')
export class WorkflowNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: NodeType,
  })
  type: NodeType;

  @Column({ type: 'jsonb' })
  configuration: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  position: { x: number; y: number };

  @Column({ type: 'jsonb', nullable: true })
  connections: Record<string, any>;

  @ManyToOne(() => Workflow, workflow => workflow.nodes)
  workflow: Workflow;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}