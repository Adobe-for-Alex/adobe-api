interface User {
    id() : Promise<string>
    email() : Promise<string>
    password() : Promise<string>
    board() : Promise<Board | undefined>
}