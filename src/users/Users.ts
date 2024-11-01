interface Users {
    all() : Promise<User[]>
    withId(id : String) : Promise<User | undefined>
}