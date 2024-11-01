interface Board {
    users(): Promise<Users>
    attach(user: User): Promise<void>
    detach(user: User): Promise<void>
    freeUserSlots(): Promise<number>
}