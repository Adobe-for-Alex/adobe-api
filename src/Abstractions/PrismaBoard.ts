import {Prisma} from "@prisma/client/extension";

class PrismaBoard implements Board {
    private readonly boardId : BoardId;
    private prisma : Prisma;
    private readonly maxSlots;
    constructor(prisma : Prisma) {
        this.prisma = prisma;
        this.maxSlots = 10;
    }

    async attach(user: User): Promise<void> {
        await this.prisma.board.update({
            where: { id: this.boardId },
            data: {
                users: {
                    connect: { id: user.id },
                },
            },
        });
    }

    async detach(user: User): Promise<void> {
        await this.prisma.board.update({
            where: { id: this.boardId },
            data: {
                users: {
                    disconnect: { id: user.id },
                },
            },
        });
    }

    async freeUserSlots(): Promise<number> {
        const currentUsers = await this.users();
        return this.maxSlots - (await currentUsers.all()).length;
    }

    async users(): Promise<Users> {
        const users = await this.prisma.board.findUnique({
            where: { id: this.boardId },
            include: { users: true },
        });
        return users?.users || [];
    }

    id(): Promise<string> {
        return this.prisma.board.id();
    }

}