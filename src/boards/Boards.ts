interface Boards {
    all(): Promise<Board[]>
    withId(id: string): Promise<Board | undefined>
    add(board : Board): Promise<Board>
}