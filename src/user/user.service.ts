import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {

    getUserProfile(username: string) {
        const urlUser = "https://alfa-leetcode-api.onrender.com/"+username;
        return fetch(urlUser).then(res => res.json());
    }
}
