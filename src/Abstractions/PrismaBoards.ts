import {Prisma} from "@prisma/client/extension";

class PrismaBoards implements Boards {
    private prisma : Prisma;
    constructor(prisma : Prisma) {
        this.prisma = prisma;
    }


    async add(board: Board): Promise<Board> {
        const newBoard = await this.prisma.board.create();
        return new PrismaBoard(this.prisma, newBoard.id);
    }

    async all(): Promise<Board[]> {
        return this.prisma.board.selectAll().map(x => new Board())
    }

    async withId(id: BoardId): Promise<Board | undefined> {
        const board = await this.prisma.board.findUnique({
            where: { id },
        });
        return board ? new prismaBoard(board.id) : undefined;
    }

}