import { Bot, InlineKeyboard } from "grammy";
import { config } from "dotenv";
import nedb from "nedb";
import { dirname } from "path";

// setups
const __dirname = dirname("");
config();

//dataBases
const Admins = new nedb("./db/Admins.db");
const Users = new nedb("./db/USERS.db");
Users.loadDatabase();
Admins.loadDatabase();

// global vars
const headAdmins = process.env.ADMINS.split(",");
let tempState = {};
const Permissions = ["Add-Admins", "Send-Global"];

const bot = new Bot(process.env.TOKEN);
bot.command("start", async (ctx) => {
  Admins.findOne({ ID: Number.parseInt(ctx.from.id) }, async (err, doc) => {
    console.log(doc);
    if (doc || headAdmins.some((c) => c == ctx.from.id)) {
      await ctx.reply(
        `ادمین عزیز برای استفاده از بات گزینه های زی  ر را انتخاب کنید`,
        {
          reply_markup: adminKeyBoard,
        }
      );
    }
    return;
  });
  // add new member to database
  Users.findOne({ ID: ctx.from.id }, (Err, doc) => {
    if (!doc)
      Users.insert({
        ID: ctx.from.id,
        name: ctx.from.first_name + "_" + ctx.from.last_name,
      });
  });
  if (headAdmins.some((c) => c == ctx.from.id)) {
    Admins.findOne({ ID: ctx.from.id }, (err, doc) => {
      if (!doc) Admins.insert({ ID: ctx.from.id, permissions: Permissions });
    });
  }
});
// keyboards
const adminKeyBoard = new InlineKeyboard()
  .text("وررود به پنل مدریت", "panel")
  .row()
  .text("وررود به ربات", "getinbot");

const panelKeyBord = new InlineKeyboard()
  .text("مدریت ادمین ها", "manageAdmins")
  .text("تست 2", "test2")
  .row()
  .text("ارسال پیام همگانی", "sendGlobal");

const AdminManagementBored = new InlineKeyboard()
  .text("اضافه کردن ادمین", "addAdmin")
  .row()
  .text("مدریت ادمین ها", "manageAdmin")
  .row()
  .text("بازگشت", "panel");

const BackToPanel = new InlineKeyboard().text("بازگشت", "panel");

// actions
bot.callbackQuery("panel", async (ctx) => {
  tempState = {};
  ctx.deleteMessage();
  ctx.reply("برگشت به ضفحه اول با /start", {
    reply_markup: panelKeyBord,
  });
});

bot.callbackQuery("addAdmin", (ctx) => {
  ctx.deleteMessage();
  ctx.reply("برای اضافه کردن ادمین آیدی عددی ادمین را ارسال کنید", {
    reply_markup: BackToPanel,
  });
  tempState.waitingForAdminID = true;
});

bot.callbackQuery("manageAdmins", async (ctx) => {
  ctx.deleteMessage();
  await ctx.reply(`مدریت ادمین ها`, {
    reply_markup: AdminManagementBored,
  });
});

bot.callbackQuery("sendGlobal", (ctx) => {
  ctx.deleteMessage();
  ctx.reply("پیام خود را برای ارسال همگانی ارسال کنید", {
    reply_markup: BackToPanel,
  });
  tempState.waitingForGlobalMessage = true;
});

bot.on("message", (ctx) => {
  if (tempState.waitingForGlobalMessage) {
    Users.find({}, async (err, doc) => {
      for (let i = 0; i < doc.length; i++) {
        if (doc[i].ID == ctx.from.id) continue;
        await bot.api.sendMessage(doc[i].ID, ctx.message.text);
      }
      ctx.reply(
        `
        پیام با موفقیت به تمام کاربران ارسال شد
      `,
        { reply_markup: BackToPanel }
      );
    });
    tempState.waitingForGlobalMessage = false;
  }
  if (tempState.waitingForAdminID) {
    Admins.findOne({ ID: ctx.message.text }, (err, doc) => {
      if (!doc) {
        Admins.insert(
          { permissions: [""], ID: Number.parseInt(ctx.message.text) },
          (err, doc) => {
            ctx.reply("ادمین با موفقیت اضافه شد", {
              reply_markup: BackToPanel,
            });
          }
        );
      } else {
        ctx.reply("آیدی شخص قبلا به عنوان ادمین در سیستم موجود می باشد", {
          reply_markup: BackToPanel,
        });
      }
    });
  }
});

bot.start();
