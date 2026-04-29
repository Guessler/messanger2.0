import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    username: string;


    @Column()
    password: string;

    @Column({ type: 'text', nullable: true })
    refreshToken: string;

    @Column({ type: 'text', nullable: true })
    avatarImage?: string;

    @Column({ type: 'timestamp', nullable: true })
    tokenExpires: Date | null;


    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
