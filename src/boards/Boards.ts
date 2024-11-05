import Board from "../board/Board";

export default interface Boards {
    all(): Promise<Board[]>
    boardWithId(id: string): Promise<Board | undefined>
    add(board : Board): Promise<Board>
}