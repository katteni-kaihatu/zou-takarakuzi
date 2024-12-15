import express from 'express';
import {PrismaClient} from '@prisma/client';
import {createMultipleRandomTicketsForUser, createRandomTicketForUser, createSequentialTicketsForUser} from "./main";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());

let shoriLock = false;

app.get("/0/:UserId", async (req, res) => {
    const UserId = req.params.UserId;
    const tickets = await prisma.lotteryTicket.findMany({
        where: {userId: UserId}
    });
    res.json(tickets);
})

app.post("/0/:UserId", async (req, res) => {
    const UserId = req.params.UserId;
    const type = req.body.type; // RANDOM1 or RANDOM10 or SEQUENTIAL10

    let user = await prisma.user.findUnique({
        where: {id: UserId}
    });

    if (!user) {
        user = await prisma.user.create({
            data: {id: UserId}
        });
    }


    const transaction = await prisma.transaction.create({
        data: {
            type: type,
            userId: UserId,
            status: 'PENDING'
        }
    })

    res.json({
        transactionId: transaction.id,
        payUrl: `https://zoubank.resonite.love/send?sendTo=cm4p9t2ly004z1296hoehs4h5&amountChange=false&amount=${type.includes("10") ? 1000 : 100}&customTransactionId=${transaction.id}`
    });
})

app.get("/0/transaction/:transactionId", async (req, res) => {
    const transactionId = req.params.transactionId;
    const transaction = await prisma.transaction.findUnique({
        where: {
            id: transactionId
        },
        include: {
            LotteryTicket: true
        }
    });
    res.json(transaction);
})

const shori = async () => {
    try {
        if (shoriLock) {
            return
        }
        shoriLock = true
        // console.log("shori batch start")
        const url = `https://zoubank.resonite.love/api/user/cm4p9t2ly004z1296hoehs4h5`
        const result = await (await fetch(url)).json()
        const incoming = result.incomingTransfers


        const pendingPayments = await prisma.transaction.findMany({
            where: {
                status: "PENDING"
            }
        })

        for (const payment of pendingPayments) {
            const transaction = incoming.find((t: any) => t.externalData.customData.customTransactionId === payment.id)
            if (transaction) {
                await prisma.transaction.update({
                    where: {
                        id: payment.id
                    },
                    data: {
                        status: "SUCCESS",
                    }
                })

                switch (payment.type) {
                    case "RANDOM1":
                        await createRandomTicketForUser(payment.userId, payment.id);
                        break;
                    case "RANDOM10":
                        await createMultipleRandomTicketsForUser(payment.userId, 10, payment.id);
                        break;
                    case "SEQUENTIAL10":
                        await createSequentialTicketsForUser(payment.userId, 10, payment.id);
                        break;
                }
            }
        }
        // console.log("shori batch end")
    } finally {
        shoriLock = false
    }
}

setInterval(shori, 1000)

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
