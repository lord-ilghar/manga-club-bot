import { Bot, InlineKeyboard } from "grammy";
import { hydrateFiles } from "@grammyjs/files";
import { config } from "dotenv";
import nedb from "nedb";
import { dirname } from "path";
//! USE Grammy ROUTER API!!!!!!!!!!!!!!!
// setups
config();
const bot = new Bot(process.env.TOKEN);
bot.api.config.use(hydrateFiles(process.env.TOKEN));

//dataBases
const Admins = new nedb("./db/Admins.db");
const Users = new nedb("./db/USERS.db");
Users.loadDatabase();
Admins.loadDatabase();

// global vars
const headAdmins = process.env.ADMINS.split(",");
let tempState = {};
const Permissions = ["Add-Admins", "Send-Global"];

// gets file format (.pdf / .zip / ...)
function getFileFormat(ctx) {
  const dotsSplits = ctx.message.document.file_name.split(".");
  return dotsSplits[dotsSplits.length - 1];
}

//TODO : make this event WORK!
bot.on(":file", async (ctx) => {
  const file = await ctx.getFile();
  const path = await file.download(
    "files/" + ctx.message.date + "." + getFileFormat(ctx)
  );
});

bot.command("start", async (ctx) => {
  Admins.findOne({ ID: Number.parseInt(ctx.from.id) }, async (err, doc) => {
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
  .text("ارسال پیام همگانی", "sendGlobal")
  .row()
  .text("اضافه کردن مانگا", "addManga") // TODO : make this button do something
  .text("لیست مانگا ها", "mangaList") // TODO : this one too
  .row()
  .text("test", "test"); //! REMOVE THIS

const AdminManagementBored = new InlineKeyboard()
  .text("اضافه کردن ادمین", "addAdmin")
  .row()
  .text("مدریت ادمین ها", "manageAdmin")
  .row()
  .text("بازگشت", "panel");

const BackToPanel = new InlineKeyboard().text("بازگشت", "panel");

const addManga_general = new InlineKeyboard()
  .text("اضافه کردن مجوعه جدید", "addNewManga")
  .row()
  .text("اضافه کردن قسمت جدید به مجموعه", "addNewChapter")
  .row()
  .text("بازگشت", "panel");

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
  tempState.waitingForAdminID = ctx.from.id;
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
  tempState.waitingForGlobalMessage = ctx.from.id;
});

bot.callbackQuery("addManga", (ctx) => {
  ctx.deleteMessage();
  ctx.reply("برای اضافه کردن مانگا گزینه های زیر را انتخاب کنید", {
    reply_markup: addManga_general,
  });
});

bot.on("message", (ctx) => {
  if (tempState.waitingForGlobalMessage == ctx.from.id) {
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
  } else if (tempState.waitingForAdminID == ctx.from.id) {
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
