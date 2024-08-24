// File: api/update-check.js
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CAPACITIES_API_KEY = process.env.CAPACITIES_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SPACE_ID = process.env.SPACE_ID;

let lastCheckTime = new Date(0); // Initialize to past date

async function fetchCapacitiesUpdates() {
  const currentTime = new Date();

  try {
    const response = await axios.post(
      "https://api.capacities.io/search",
      {
        mode: "fullText",
        searchTerm: "",
        spaceIds: [SPACE_ID],
        filterStructureIds: [],
      },
      {
        headers: {
          Authorization: `Bearer ${CAPACITIES_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.status === 200) {
      const updates = response.data.results.filter(
        (item) => new Date(item.updatedAt) > lastCheckTime,
      );
      lastCheckTime = currentTime;
      return updates;
    } else {
      console.error(`Error fetching updates: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error("Error fetching updates:", error);
    return [];
  }
}

async function sendDiscordUpdates(updates) {
  if (updates.length === 0) return;

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(DISCORD_TOKEN);

  const channel = await client.channels.fetch(CHANNEL_ID);
  for (const update of updates) {
    const embed = new EmbedBuilder()
      .setTitle(`Update in ${update.structureId}`)
      .setDescription(update.title)
      .setColor(0x00ff00)
      .addFields(
        { name: "ID", value: update.id },
        { name: "Space ID", value: update.spaceId },
      )
      .setFooter({ text: `Updated at ${update.updatedAt}` });

    await channel.send({ embeds: [embed] });
  }

  await client.destroy();
}

module.exports = async (req, res) => {
  if (req.method === "POST") {
    const updates = await fetchCapacitiesUpdates();
    await sendDiscordUpdates(updates);
    res.status(200).json({ message: "Update check completed" });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
};
