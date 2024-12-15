import {PrismaClient} from '@prisma/client';
import './api';

const prisma = new PrismaClient();

const MAX_NUMBER = 999;
const START_CLASS = 'A';

type LotteryTicket = {
    class: string;
    number: number;
};


// Helper function to find the next available number in a specific class
async function getNextAvailableNumber(ticketClass: string): Promise<number | null> {
    const usedNumbers = await prisma.lotteryTicket.findMany({
        where: {class: ticketClass},
        select: {number: true}
    });
    const usedNumberSet = new Set(usedNumbers.map(ticket => ticket.number));



    for (let i = 0; i <= MAX_NUMBER; i++) {
        if (!usedNumberSet.has(i)) {
            return i;
        }
    }
    return null; // No numbers available in this class
}

async function getRandomAvailableNumber(ticketClass: string): Promise<number | null> {
    const usedNumbers = await prisma.lotteryTicket.findMany({
        where: {class: ticketClass},
        select: {number: true}
    });
    const usedNumberSet = new Set(usedNumbers.map(ticket => ticket.number));


    const array = Array.from({length: MAX_NUMBER}, (_, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    for (let i = 0; i <= MAX_NUMBER; i++) {
        if (!usedNumberSet.has(array[i])) {
            return array[i];
        }
    }
    return null; // No numbers available in this class
}

// Generate a random ticket prioritizing available numbers in START_CLASS
async function generateRandomTicket(): Promise<LotteryTicket> {
    let ticketClass = START_CLASS;
    let ticketNumber: number | null = await getRandomAvailableNumber(ticketClass);


    while (!ticketNumber) {
        ticketClass = String.fromCharCode(ticketClass.charCodeAt(0) + 1);
        ticketNumber = await getRandomAvailableNumber(ticketClass);
    }
    console.log("ticketClass", ticketClass, 'ticketNumber:', ticketNumber);
    return {class: ticketClass, number: ticketNumber};
}

// Helper function to find a range of consecutive available numbers in a specific class
async function getConsecutiveAvailableNumbers(ticketClass: string, count: number): Promise<number[] | null> {
    const usedNumbers = await prisma.lotteryTicket.findMany({
        where: {class: ticketClass},
        select: {number: true}
    });
    const usedNumberSet = new Set(usedNumbers.map(ticket => ticket.number));

    let consecutiveNumbers: number[] = [];
    for (let i = 0; i <= MAX_NUMBER; i++) {
        if (!usedNumberSet.has(i)) {
            consecutiveNumbers.push(i);
            if (consecutiveNumbers.length === count) {
                return consecutiveNumbers;
            }
        } else {
            consecutiveNumbers = []; // Reset if a gap is found
        }
    }
    return null; // No range of consecutive numbers found
}

// Generate sequential tickets prioritizing START_CLASS
// Generate sequential tickets prioritizing START_CLASS
async function generateSequentialTickets(count: number): Promise<LotteryTicket[]> {
    const tickets: LotteryTicket[] = [];
    let currentClass = START_CLASS;

    while (tickets.length < count) {
        const availableNumbers = await getConsecutiveAvailableNumbers(currentClass, count - tickets.length);

        if (availableNumbers) {
            for (const number of availableNumbers) {
                tickets.push({class: currentClass, number});
            }
        } else {
            // 次の文字
            currentClass = String.fromCharCode(currentClass.charCodeAt(0) + 1);
        }
    }

    return tickets;
}

// Helper function to check if a ticket exists
async function ticketExists(ticketClass: string, ticketNumber: number): Promise<boolean> {
    const ticket = await prisma.lotteryTicket.findFirst({
        where: {
            class: ticketClass,
            number: ticketNumber
        }
    });
    return !!ticket;
}

// Create a random ticket and save it to the database for a specific user
async function createRandomTicketForUser(userId: string, transactionId: string): Promise<LotteryTicket> {
    const ticket = await generateRandomTicket();
    await prisma.lotteryTicket.create({
        data: {
            class: ticket.class,
            number: ticket.number,
            userId: userId,
            transactionId: transactionId
        }
    });
    return ticket;
}

// Create multiple random tickets and save them to the database for a specific user
async function createMultipleRandomTicketsForUser(userId: string, count: number, transactionId: string): Promise<LotteryTicket[]> {
    const tickets: LotteryTicket[] = [];
    for (let i = 0; i < count; i++) {
        const ticket = await generateRandomTicket();
        const newTicket = await prisma.lotteryTicket.create({
            data: {
                class: ticket.class,
                number: ticket.number,
                userId: userId,
                transactionId: transactionId
            }
        });
        tickets.push(ticket);
    }
    return tickets;
}

// Create sequential tickets and save them to the database for a specific user
async function createSequentialTicketsForUser(userId: string, count: number, transactionId: string): Promise<LotteryTicket[]> {
    const tickets = await generateSequentialTickets(count);
    for (const ticket of tickets) {
        await prisma.lotteryTicket.create({
            data: {
                class: ticket.class,
                number: ticket.number,
                userId: userId,
                transactionId: transactionId
            }
        });
    }
    return tickets;
}


export { createSequentialTicketsForUser, createRandomTicketForUser, createMultipleRandomTicketsForUser}
