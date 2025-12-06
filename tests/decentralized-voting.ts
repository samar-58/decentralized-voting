import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { DecentralizedVoting } from "../target/types/decentralized_voting";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("decentralized-voting", () => {

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .decentralizedVoting as Program<DecentralizedVoting>;


  const baseId = Math.floor(Date.now() / 1000);
  let pollIdCounter = 0;
  const getUniquePollId = (): BN => {
    pollIdCounter++;
    return new BN(baseId * 1000 + pollIdCounter);
  };


  const getPollPDA = (creator: PublicKey, pollId: BN): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("poll"),
        creator.toBuffer(),
        pollId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
  };

  const getVoteRecordPDA = (
    poll: PublicKey,
    voter: PublicKey
  ): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), poll.toBuffer(), voter.toBuffer()],
      program.programId
    );
  };

  const getCurrentTimestamp = async (): Promise<number> => {
    const clock = await provider.connection.getBlockTime(
      await provider.connection.getSlot()
    );
    return clock || Math.floor(Date.now() / 1000);
  };


  const airdrop = async (pubkey: PublicKey, amount: number = 2) => {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  };


  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  describe("create_poll", () => {
    it("should create a poll successfully", async () => {
      const pollId = getUniquePollId();
      const question = "What is your favorite color?";
      const options = ["Red", "Blue", "Green"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 1);
      const endTime = new BN(currentTime + 3600);

      const [pollPDA] = getPollPDA(provider.wallet.publicKey, pollId);

      await program.methods
        .createPoll(pollId, question, options, startTime, endTime)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPDA);

      expect(pollAccount.creator.toString()).to.equal(
        provider.wallet.publicKey.toString()
      );
      expect(pollAccount.pollId.toNumber()).to.equal(pollId.toNumber());
      expect(pollAccount.question).to.equal(question);
      expect(pollAccount.options).to.deep.equal(options);
      expect(pollAccount.voteCounts.map((v) => v.toNumber())).to.deep.equal([
        0, 0, 0,
      ]);
      expect(pollAccount.startTime.toNumber()).to.equal(startTime.toNumber());
      expect(pollAccount.endTime.toNumber()).to.equal(endTime.toNumber());
      expect(pollAccount.isClosed).to.be.false;
    });

    it("should create a poll with exactly 2 options", async () => {
      const pollId = getUniquePollId();
      const question = "Yes or No?";
      const options = ["Yes", "No"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 1);
      const endTime = new BN(currentTime + 3600);

      const [pollPDA] = getPollPDA(provider.wallet.publicKey, pollId);

      await program.methods
        .createPoll(pollId, question, options, startTime, endTime)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPDA);
      expect(pollAccount.options.length).to.equal(2);
    });

    it("should create a poll with exactly 10 options", async () => {
      const pollId = getUniquePollId();
      const question = "Pick a number";
      const options = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 1);
      const endTime = new BN(currentTime + 3600);

      const [pollPDA] = getPollPDA(provider.wallet.publicKey, pollId);

      await program.methods
        .createPoll(pollId, question, options, startTime, endTime)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPDA);
      expect(pollAccount.options.length).to.equal(10);
    });

    it("should fail with less than 2 options", async () => {
      const pollId = getUniquePollId();
      const question = "Invalid poll";
      const options = ["Only one option"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 1);
      const endTime = new BN(currentTime + 3600);

      try {
        await program.methods
          .createPoll(pollId, question, options, startTime, endTime)
          .accounts({
            creator: provider.wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("NotEnoughOptions");
      }
    });

    it("should fail with more than 10 options", async () => {
      const pollId = getUniquePollId();
      const question = "Too many options";
      const options = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
      ];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 1);
      const endTime = new BN(currentTime + 3600);

      try {
        await program.methods
          .createPoll(pollId, question, options, startTime, endTime)
          .accounts({
            creator: provider.wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("TooManyOptions");
      }
    });

    it("should fail with question longer than 200 characters", async () => {
      const pollId = getUniquePollId();
      const question = "a".repeat(201);
      const options = ["Yes", "No"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 1);
      const endTime = new BN(currentTime + 3600);

      try {
        await program.methods
          .createPoll(pollId, question, options, startTime, endTime)
          .accounts({
            creator: provider.wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("QuestionTooLong");
      }
    });

    it("should fail with start time in the past", async () => {
      const pollId = getUniquePollId();
      const question = "Past start time";
      const options = ["Yes", "No"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime - 100);
      const endTime = new BN(currentTime + 3600);

      try {
        await program.methods
          .createPoll(pollId, question, options, startTime, endTime)
          .accounts({
            creator: provider.wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("StartTimeInPast");
      }
    });

    it("should fail with end time before start time", async () => {
      const pollId = getUniquePollId();
      const question = "Invalid times";
      const options = ["Yes", "No"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 3600);
      const endTime = new BN(currentTime + 1800);

      try {
        await program.methods
          .createPoll(pollId, question, options, startTime, endTime)
          .accounts({
            creator: provider.wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("EndBeforeStart");
      }
    });
  });

  describe("vote", () => {
    let votePollId: BN;
    let votePollPDA: PublicKey;
    let voter: Keypair;

    before(async () => {
      votePollId = getUniquePollId();
      const question = "Vote test poll";
      const options = ["Option A", "Option B", "Option C"];
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 2);
      const endTime = new BN(currentTime + 3600);

      [votePollPDA] = getPollPDA(provider.wallet.publicKey, votePollId);

      await program.methods
        .createPoll(votePollId, question, options, startTime, endTime)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      await sleep(3000);

      voter = Keypair.generate();
      await airdrop(voter.publicKey);
    });

    it("should vote successfully", async () => {
      const choiceIndex = 0;
      const [voteRecordPDA] = getVoteRecordPDA(votePollPDA, voter.publicKey);

      await program.methods
        .vote(choiceIndex)
        .accounts({
          poll: votePollPDA,
          voter: voter.publicKey,
        })
        .signers([voter])
        .rpc();

      const pollAccount = await program.account.poll.fetch(votePollPDA);
      expect(pollAccount.voteCounts[0].toNumber()).to.equal(1);
      expect(pollAccount.voteCounts[1].toNumber()).to.equal(0);
      expect(pollAccount.voteCounts[2].toNumber()).to.equal(0);

      const voteRecord = await program.account.voteRecord.fetch(voteRecordPDA);
      expect(voteRecord.poll.toString()).to.equal(votePollPDA.toString());
      expect(voteRecord.voter.toString()).to.equal(voter.publicKey.toString());
      expect(voteRecord.choiceIndex).to.equal(choiceIndex);
    });

    it("should allow multiple different voters", async () => {
      const voter2 = Keypair.generate();
      await airdrop(voter2.publicKey);

      const choiceIndex = 1;
      const [voteRecordPDA] = getVoteRecordPDA(votePollPDA, voter2.publicKey);

      await program.methods
        .vote(choiceIndex)
        .accounts({
          poll: votePollPDA,
          voter: voter2.publicKey,
        })
        .signers([voter2])
        .rpc();

      const pollAccount = await program.account.poll.fetch(votePollPDA);
      expect(pollAccount.voteCounts[0].toNumber()).to.equal(1);
      expect(pollAccount.voteCounts[1].toNumber()).to.equal(1);
      expect(pollAccount.voteCounts[2].toNumber()).to.equal(0);
    });

    it("should fail when voting twice (same voter)", async () => {
      const choiceIndex = 2;

      try {
        await program.methods
          .vote(choiceIndex)
          .accounts({
            poll: votePollPDA,
            voter: voter.publicKey,
          })
          .signers([voter])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        // The account already exists, so this should fail
        expect(error.message).to.include("already in use");
      }
    });

    it("should fail with invalid option index", async () => {
      const voter3 = Keypair.generate();
      await airdrop(voter3.publicKey);

      const choiceIndex = 10;

      try {
        await program.methods
          .vote(choiceIndex)
          .accounts({
            poll: votePollPDA,
            voter: voter3.publicKey,
          })
          .signers([voter3])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("InvalidOption");
      }
    });

    it("should fail when poll has not started", async () => {
      const futurePollId = getUniquePollId();
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 3600);
      const endTime = new BN(currentTime + 7200);

      const [futurePollPDA] = getPollPDA(
        provider.wallet.publicKey,
        futurePollId
      );

      await program.methods
        .createPoll(
          futurePollId,
          "Future poll",
          ["A", "B"],
          startTime,
          endTime
        )
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      const voter4 = Keypair.generate();
      await airdrop(voter4.publicKey);

      try {
        await program.methods
          .vote(0)
          .accounts({
            poll: futurePollPDA,
            voter: voter4.publicKey,
          })
          .signers([voter4])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("PollNotStarted");
      }
    });

    it("should fail when poll has ended", async () => {
      const pastPollId = getUniquePollId();
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 2);
      const endTime = new BN(currentTime + 4);

      const [pastPollPDA] = getPollPDA(provider.wallet.publicKey, pastPollId);

      await program.methods
        .createPoll(pastPollId, "Short poll", ["A", "B"], startTime, endTime)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      await sleep(6000);

      const voter5 = Keypair.generate();
      await airdrop(voter5.publicKey);

      try {
        await program.methods
          .vote(0)
          .accounts({
            poll: pastPollPDA,
            voter: voter5.publicKey,
          })
          .signers([voter5])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("PollEnded");
      }
    });

    it("should fail when poll is closed", async () => {
      const closedPollId = getUniquePollId();
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 2);
      const endTime = new BN(currentTime + 4);

      const [closedPollPDA] = getPollPDA(
        provider.wallet.publicKey,
        closedPollId
      );

      await program.methods
        .createPoll(
          closedPollId,
          "Quick poll",
          ["A", "B"],
          startTime,
          endTime
        )
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      await sleep(5000);

      await program.methods
        .closePoll()
        .accounts({
          poll: closedPollPDA,
          creator: provider.wallet.publicKey,
        })
        .rpc();

      const voter6 = Keypair.generate();
      await airdrop(voter6.publicKey);

      try {
        await program.methods
          .vote(0)
          .accounts({
            poll: closedPollPDA,
            voter: voter6.publicKey,
          })
          .signers([voter6])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(["PollClosed", "PollEnded"]).to.include(
          error.error.errorCode.code
        );
      }
    });
  });

  describe("close_poll", () => {
    it("should close a poll successfully after end time", async () => {
      const pollId = getUniquePollId();
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 2);
      const endTime = new BN(currentTime + 4);

      const [pollPDA] = getPollPDA(provider.wallet.publicKey, pollId);

      await program.methods
        .createPoll(pollId, "Quick close poll", ["A", "B"], startTime, endTime)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      await sleep(6000);

      await program.methods
        .closePoll()
        .accounts({
          poll: pollPDA,
          creator: provider.wallet.publicKey,
        })
        .rpc();

      const pollAccount = await program.account.poll.fetch(pollPDA);
      expect(pollAccount.isClosed).to.be.true;
    });

    it("should fail when poll has not ended yet", async () => {
      const pollId = getUniquePollId();
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 2);
      const endTime = new BN(currentTime + 3600);

      const [pollPDA] = getPollPDA(provider.wallet.publicKey, pollId);

      await program.methods
        .createPoll(pollId, "Long running poll", ["A", "B"], startTime, endTime)
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      try {
        await program.methods
          .closePoll()
          .accounts({
            poll: pollPDA,
            creator: provider.wallet.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("PollNotEndedYet");
      }
    });

    it("should fail when non-creator tries to close poll", async () => {
      const pollId = getUniquePollId();
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 2);
      const endTime = new BN(currentTime + 5);

      const [pollPDA] = getPollPDA(provider.wallet.publicKey, pollId);

      await program.methods
        .createPoll(
          pollId,
          "Unauthorized close test",
          ["A", "B"],
          startTime,
          endTime
        )
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      await sleep(5000);

      const unauthorizedUser = Keypair.generate();
      await airdrop(unauthorizedUser.publicKey);

      try {
        await program.methods
          .closePoll()
          .accounts({
            poll: pollPDA,
            creator: unauthorizedUser.publicKey,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("Unauthorized");
      }
    });
  });

  describe("poll results", () => {
    it("should correctly track multiple votes", async () => {
      const pollId = getUniquePollId();
      const currentTime = await getCurrentTimestamp();
      const startTime = new BN(currentTime + 2);
      const endTime = new BN(currentTime + 3600);

      const [pollPDA] = getPollPDA(provider.wallet.publicKey, pollId);

      await program.methods
        .createPoll(
          pollId,
          "Multi-vote poll",
          ["A", "B", "C"],
          startTime,
          endTime
        )
        .accounts({
          creator: provider.wallet.publicKey,
        })
        .rpc();

      await sleep(3000);

      const voters: Keypair[] = [];
      for (let i = 0; i < 5; i++) {
        const voter = Keypair.generate();
        await airdrop(voter.publicKey);
        voters.push(voter);
      }

      const votes = [0, 0, 1, 1, 2];

      for (let i = 0; i < voters.length; i++) {
        await program.methods
          .vote(votes[i])
          .accounts({
            poll: pollPDA,
            voter: voters[i].publicKey,
          })
          .signers([voters[i]])
          .rpc();
      }

      const pollAccount = await program.account.poll.fetch(pollPDA);
      expect(pollAccount.voteCounts[0].toNumber()).to.equal(2);
      expect(pollAccount.voteCounts[1].toNumber()).to.equal(2);
      expect(pollAccount.voteCounts[2].toNumber()).to.equal(1);
    });
  });
});
