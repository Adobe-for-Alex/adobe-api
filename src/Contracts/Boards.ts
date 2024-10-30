interface Boards {
    GetAllBoards() : Board[];
    GetBoard(args0: string| number) : Board;
    RemoveBoard() : void;
    AddBoard(arg0: Board) : void;
}