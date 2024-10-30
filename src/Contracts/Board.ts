interface Board {
    GetAllUsers() : User[];
    AddUser(args0: User) : void
    RemoveUser() : void;
    GetFreePlacesQuantity() : number;
    GetSubscriptionType() : string;
    IsSubscriptionValid () : boolean;
}