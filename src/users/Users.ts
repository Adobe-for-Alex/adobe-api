import User from "../user/User";

export default interface Users {
    all() : Promise<User[]>
    userWithId(id : String) : Promise<User | undefined>
}