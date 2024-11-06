import User from "../user/User";

export default interface Users {
    all(): Promise<User[]>
    withId(id: String): Promise<User | undefined>
}